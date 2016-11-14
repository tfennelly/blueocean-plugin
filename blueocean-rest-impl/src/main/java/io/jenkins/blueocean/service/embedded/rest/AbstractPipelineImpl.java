package io.jenkins.blueocean.service.embedded.rest;

import com.google.common.base.Predicate;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.Iterators;
import com.google.common.collect.Lists;
import hudson.Extension;
import hudson.Util;
import hudson.model.AbstractItem;
import hudson.model.Action;
import hudson.model.Item;
import hudson.model.ItemGroup;
import hudson.model.Job;
import hudson.model.Run;
import hudson.model.User;
import hudson.plugins.favorite.Favorites;
import hudson.plugins.favorite.user.FavoriteUserProperty;
import io.jenkins.blueocean.commons.ServiceException;
import io.jenkins.blueocean.rest.Navigable;
import io.jenkins.blueocean.rest.Reachable;
import io.jenkins.blueocean.rest.annotation.Capability;
import io.jenkins.blueocean.rest.hal.Link;
import io.jenkins.blueocean.rest.model.BlueActionProxy;
import io.jenkins.blueocean.rest.model.BlueFavorite;
import io.jenkins.blueocean.rest.model.BlueFavoriteAction;
import io.jenkins.blueocean.rest.model.BluePipeline;
import io.jenkins.blueocean.rest.model.BlueQueueContainer;
import io.jenkins.blueocean.rest.model.BlueRun;
import io.jenkins.blueocean.rest.model.BlueRunContainer;
import io.jenkins.blueocean.rest.model.Container;
import io.jenkins.blueocean.rest.model.Containers;
import io.jenkins.blueocean.rest.model.Resource;
import io.jenkins.blueocean.service.embedded.util.FavoriteUtil;
import org.kohsuke.stapler.Stapler;
import org.kohsuke.stapler.StaplerRequest;
import org.kohsuke.stapler.WebMethod;
import org.kohsuke.stapler.json.JsonBody;
import org.kohsuke.stapler.verb.DELETE;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static io.jenkins.blueocean.rest.model.KnownCapabilities.JENKINS_JOB;

/**
 * Pipeline abstraction implementation. Use it to extend other kind of jenkins jobs
 *
 * @author Vivek Pandey
 */
@Capability(JENKINS_JOB)
public class AbstractPipelineImpl extends BluePipeline {
    private final Job job;

    protected AbstractPipelineImpl(Job job) {
        this.job = job;
    }

    @Override
    public String getOrganization() {
        return OrganizationImpl.INSTANCE.getName();
    }

    @Override
    public String getName() {
        return job.getName();
    }

    @Override
    public String getDisplayName() {
        return job.getDisplayName();
    }

    @Override
    public Integer getWeatherScore() {
        return job.getBuildHealth().getScore();
    }

    @Override
    public BlueRun getLatestRun() {
        if(job.getLastBuild() == null){
            return null;
        }
        return AbstractRunImpl.getBlueRun(job.getLastBuild(), this);
    }

    @Override
    public Long getEstimatedDurationInMillis() {
        return job.getEstimatedDuration();
    }

    @Override
    public String getLastSuccessfulRun() {
        if(job.getLastSuccessfulBuild() != null){
            String id = job.getLastSuccessfulBuild().getId();

            return Stapler.getCurrentRequest().getRootPath()+getLink().getHref()+"runs/"+id+"/";
        }
        return null;
    }

    @Override
    public BlueRunContainer getRuns() {
        return new RunContainerImpl(this, job);
    }

    @Override
    public Collection<BlueActionProxy> getActions() {
        return getActionProxies(job.getAllActions(), this);
    }

    @Override
    @Navigable
    public BlueQueueContainer getQueue() {
        return new QueueContainerImpl(this);
    }


    @WebMethod(name="") @DELETE
    public void delete() throws IOException, InterruptedException {
        job.delete();
    }


    @Override
    public BlueFavorite favorite(@JsonBody BlueFavoriteAction favoriteAction) {
        if(favoriteAction == null) {
            throw new ServiceException.BadRequestExpception("Must provide pipeline name");
        }
        FavoriteUtil.toggle(favoriteAction, job);
        return FavoriteUtil.getFavorite(job, new Reachable() {
            @Override
            public Link getLink() {
                return AbstractPipelineImpl.this.getLink().ancestor();
            }
        });

    }

    @Override
    public String getFullName(){
        return job.getFullName();
    }

    @Override
    public String getFullDisplayName() {
        return getFullDisplayName(job.getParent(), Util.rawEncode(job.getDisplayName()));
    }

    /**
     * Returns full display name. Each display name is separated by '/' and each display name is url encoded.
     *
     * @param parent parent folder
     * @param displayName URL encoded display name. Caller must pass urlencoded name
     *
     * @return full display name
     */
    public static String getFullDisplayName(@Nonnull ItemGroup parent, @Nullable String displayName){
        String name = parent.getDisplayName();
        if(name.length() == 0 ) return displayName;

        if(name.length() > 0  && parent instanceof AbstractItem) {
            if(displayName == null){
                return getFullDisplayName(((AbstractItem)parent).getParent(), String.format("%s", Util.rawEncode(name)));
            }else {
                return getFullDisplayName(((AbstractItem) parent).getParent(), String.format("%s/%s", Util.rawEncode(name),displayName));
            }
        }
        return displayName;
    }

    @Override
    public Link getLink() {
        return OrganizationImpl.INSTANCE.getLink().rel("pipelines").rel(getRecursivePathFromFullName(this));
    }

    public static String getRecursivePathFromFullName(BluePipeline pipeline){
        StringBuilder pipelinePath = new StringBuilder();
        String[] names = pipeline.getFullName().split("/");
        int count = 1;
        if(names.length > 1) { //nested
            for (String n : names) {
                if(count == 1){
                    pipelinePath.append(n);
                }else{
                    pipelinePath.append("/pipelines/").append(n);
                }
                count++;
            }
        }else{
            pipelinePath.append(pipeline.getFullName());
        }
        return pipelinePath.toString();
    }

    public static Collection<BlueActionProxy> getActionProxies(List<? extends Action> actions, Reachable parent){
        List<BlueActionProxy> actionProxies = new ArrayList<>();
        for(Action action:actions){
            if(action == null){
                continue;
            }
            actionProxies.add(new ActionProxiesImpl(action, parent));
        }
        return actionProxies;

    }

    public Container<Resource> getActivities() {
        int start = getRequestParamAsInteger("start", 0);
        int limit = getRequestParamAsInteger("limit", 20);
        List<? extends Resource> resultSet = Lists.newArrayList(getQueue().iterator());

        if (start > resultSet.size()) {
            resultSet.clear();
        } else if (start > 0) {
            // Remove up to start.
            resultSet = resultSet.subList(start, resultSet.size());
        }

        if (resultSet.size() > limit) {
            // Truncate it down to the request resultset
            // size limit.
            resultSet = resultSet.subList(0, limit);
        } else if (resultSet.size() < limit) {
            // We need some more. Get those from the Runs.
            Container runContainer = new RunContainerImpl(this, job);
            Iterator runsIterator = runContainer.iterator(start - resultSet.size(), limit - resultSet.size());
            resultSet = Lists.newArrayList(Iterators.concat(resultSet.iterator(), runsIterator));
        }

        return Containers.fromResource(getLink(), Lists.newArrayList(resultSet));
    }

    /**
     * Gives underlying Jenkins job
     *
     * @return jenkins job
     */
    public Job getJob(){
        return job;
    }

    @Extension(ordinal = 0)
    public static class PipelineFactoryImpl extends BluePipelineFactory {

        @Override
        public BluePipeline getPipeline(Item item, Reachable parent) {
            if (item instanceof Job) {
                return new AbstractPipelineImpl((Job) item);
            }
            return null;
        }

        @Override
        public Resource resolve(Item context, Reachable parent, Item target) {
            if(context == target && target instanceof Job) {
                return getPipeline(target,parent);
            }
            return null;
        }
    }

    @Override
    public Map<String, Boolean> getPermissions(){
        return getPermissions(job);
    }

    public static Map<String, Boolean> getPermissions(AbstractItem item){
        return ImmutableMap.of(
            BluePipeline.CREATE_PERMISSION, item.getACL().hasPermission(Item.CREATE),
            BluePipeline.READ_PERMISSION, item.getACL().hasPermission(Item.READ),
            BluePipeline.START_PERMISSION, item.getACL().hasPermission(Item.BUILD),
            BluePipeline.STOP_PERMISSION, item.getACL().hasPermission(Item.CANCEL)
        );
    }

    public static final Predicate<Run> isRunning = new Predicate<Run>() {
        public boolean apply(Run r) {
            return r.isBuilding();
        }
    };

    public boolean isFavorite() {
        User user = User.current();
        return user != null && Favorites.isFavorite(user, job);
    }

    private int getRequestParamAsInteger(String name, int defaultVal) {
        StaplerRequest request = Stapler.getCurrentRequest();
        String paramValue = request.getParameter(name);

        if (paramValue != null) {
            try {
                return Integer.parseInt(paramValue);
            } catch (NumberFormatException e) {
                // Fall through and return default. Maybe log a warning?
            }
        }

        return defaultVal;
    }
}
